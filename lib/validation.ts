const USERNAME_MIN_LENGTH = 2;
const USERNAME_MAX_LENGTH = 20;
const USERNAME_PATTERN = /^[A-Za-z0-9_. -]+$/;
const INVITE_CODE_PATTERN = /^JUST-[A-HJ-NP-Z2-9]{6}$/;
const BLOCKED_USERNAME_PARTS = [
  'admin',
  'just20',
  'moderator',
  'support',
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'cunt',
  'nazi',
  'hitler',
];

export type UsernameValidation = {
  username: string | null;
  error: string | null;
};

export type InviteCodeValidation = {
  code: string | null;
  error: string | null;
};

export function normalizeUsername(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

export function validateUsername(
  input: string,
  options: { optional?: boolean } = {}
): UsernameValidation {
  const username = normalizeUsername(input);

  if (!username) {
    return options.optional
      ? { username: null, error: null }
      : { username: null, error: 'Enter a name first.' };
  }

  if (username.length < USERNAME_MIN_LENGTH) {
    return { username: null, error: `Use at least ${USERNAME_MIN_LENGTH} characters.` };
  }

  if (username.length > USERNAME_MAX_LENGTH) {
    return { username: null, error: `Use ${USERNAME_MAX_LENGTH} characters or fewer.` };
  }

  if (!USERNAME_PATTERN.test(username)) {
    return { username: null, error: 'Use letters, numbers, spaces, dots, dashes, or underscores.' };
  }

  const compact = username.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (BLOCKED_USERNAME_PARTS.some(part => compact.includes(part))) {
    return { username: null, error: 'Choose a different name.' };
  }

  return { username, error: null };
}

export function normalizeInviteCode(input: string): string {
  const compact = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = compact.startsWith('JUST') ? compact.slice(4) : compact;
  return body ? `JUST-${body}` : '';
}

export function validateInviteCode(input: string): InviteCodeValidation {
  const code = normalizeInviteCode(input);
  if (!code) return { code: null, error: 'Enter a code first.' };
  if (!INVITE_CODE_PATTERN.test(code)) {
    return { code: null, error: 'Use a valid Just 20 invite code.' };
  }
  return { code, error: null };
}
