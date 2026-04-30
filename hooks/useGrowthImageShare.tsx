import * as Sharing from 'expo-sharing';
import { useCallback, useRef, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { GrowthShareCard, type GrowthShareCardModel } from '../components/GrowthShareCard';
import {
  growthEventFromPayload,
  recordGrowthEvent,
  type GrowthSharePayload,
  type ShareContext,
} from '../lib/growth';

type ShareVisualOverrides = Partial<
  Pick<
    GrowthShareCardModel,
    'body' | 'footer' | 'heroGlyph' | 'statLabel' | 'statValue' | 'tone' | 'title'
  >
>;

export function useGrowthImageShare() {
  const shareShotRef = useRef<ViewShot>(null);
  const [cardModel, setCardModel] = useState<GrowthShareCardModel | null>(null);

  const shareGrowthPayload = useCallback(
    async (
      payload: GrowthSharePayload,
      surface: string,
      overrides: ShareVisualOverrides = {}
    ): Promise<boolean> => {
      try {
        await recordGrowthEvent(
          growthEventFromPayload(payload, 'share_opened', { surface, format: 'image' })
        );
        setCardModel(buildShareCardModel(payload, surface, overrides));
        await waitForRender();

        const uri = await shareShotRef.current?.capture?.();
        if (uri && (await Sharing.isAvailableAsync())) {
          await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: payload.title });
        } else {
          await Share.share({ message: payload.message, title: payload.title });
        }
        return true;
      } catch (error) {
        await recordGrowthEvent(
          growthEventFromPayload(payload, 'share_failed', {
            surface,
            format: 'image',
            message: error instanceof Error ? error.message : String(error),
          })
        );
        return false;
      } finally {
        setCardModel(null);
      }
    },
    []
  );

  const visualShareElement = cardModel ? (
    <View pointerEvents="none" collapsable={false} style={styles.hiddenShareHost}>
      <ViewShot
        ref={shareShotRef}
        options={{ format: 'png', quality: 1.0 }}
        style={styles.captureRoot}
      >
        <GrowthShareCard {...cardModel} />
      </ViewShot>
    </View>
  ) : null;

  return { shareGrowthPayload, visualShareElement };
}

function buildShareCardModel(
  payload: GrowthSharePayload,
  surface: string,
  overrides: ShareVisualOverrides
): GrowthShareCardModel {
  const defaults = getContextDefaults(payload.context, payload.message);
  return {
    eyebrow: formatSurface(surface),
    title: payload.title,
    body: cleanShareBody(payload.message),
    inviteCode: payload.inviteCode,
    link: payload.link,
    footer: 'No gym. 20 pushups. Keep me honest.',
    ...defaults,
    ...overrides,
  };
}

function getContextDefaults(
  context: ShareContext,
  message: string
): Pick<GrowthShareCardModel, 'heroGlyph' | 'statLabel' | 'statValue' | 'tone'> {
  const day = matchFirst(message, /Day\s+(\d+)/i);

  switch (context) {
    case 'duel': {
      const seconds = matchFirst(message, /in\s+(\d+)s/i) ?? '60';
      return {
        heroGlyph: `${seconds}s`,
        statLabel: 'time to beat',
        statValue: `${seconds}s`,
        tone: 'ice',
      };
    }
    case 'team': {
      const room = matchFirst(message, /team room:\s*([A-Z0-9-]+)/i) ?? 'TEAM-J20';
      return { heroGlyph: 'TEAM', statLabel: 'room code', statValue: room, tone: 'dark' };
    }
    case 'weekly_wrapped': {
      const completed = matchFirst(message, /(\d+)\/7/i) ?? '0';
      return {
        heroGlyph: `${completed}/7`,
        statLabel: 'days this week',
        statValue: `${completed}/7`,
        tone: 'success',
      };
    }
    case 'weekly_challenge':
      return { heroGlyph: '7', statLabel: 'weekly pact', statValue: '7 days', tone: 'success' };
    case 'monthly_test': {
      const reps = matchFirst(message, /test:\s*(\d+)/i) ?? '20';
      return { heroGlyph: reps, statLabel: 'clean reps', statValue: reps, tone: 'streak' };
    }
    case 'badge': {
      const xp = matchFirst(message, /\+(\d+)\s*XP/i) ?? 'XP';
      return { heroGlyph: 'XP', statLabel: 'badge XP', statValue: `+${xp}`, tone: 'badge' };
    }
    case 'pet':
      return {
        heroGlyph: '🔥',
        statLabel: 'streak pet',
        statValue: day ? `Day ${day}` : 'Active',
        tone: 'streak',
      };
    case 'nudge':
      return { heroGlyph: '20', statLabel: 'pushups today', statValue: '20', tone: 'streak' };
    case 'streak':
      return {
        heroGlyph: '🔥',
        statLabel: 'current streak',
        statValue: day ? `Day ${day}` : 'Day 1',
        tone: 'streak',
      };
    case 'challenge':
    case 'profile':
      return {
        heroGlyph: '20',
        statLabel: day ? 'current streak' : 'daily challenge',
        statValue: day ? `Day ${day}` : '20/day',
        tone: 'default',
      };
    case 'completion':
    case 'squad':
    default:
      return {
        heroGlyph: '20',
        statLabel: 'daily challenge',
        statValue: day ? `Day ${day}` : '20/day',
        tone: 'default',
      };
  }
}

function cleanShareBody(message: string): string {
  const body = message
    .split('\n')
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !line.startsWith('just20://') &&
        !line.startsWith('Code:') &&
        line !== '#just20' &&
        line !== 'Join me:' &&
        line !== 'Try to catch me:'
    )
    .join(' ');

  return truncate(body, 220);
}

function formatSurface(surface: string): string {
  return surface
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function matchFirst(value: string, pattern: RegExp): string | null {
  return value.match(pattern)?.[1] ?? null;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function waitForRender(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 120));
}

const styles = StyleSheet.create({
  hiddenShareHost: {
    position: 'absolute',
    left: -10000,
    top: 0,
    width: 390,
    minHeight: 540,
  },
  captureRoot: {
    width: 390,
    backgroundColor: 'transparent',
  },
});
