import { SetMetadata } from '@nestjs/common';
import { RATE_LIMIT_POLICY_KEY, RATE_LIMIT_SKIP_KEY } from '../constants/rate-limit.constants';
import { RateLimitPolicy } from '../types/rate-limit.types';

export const RateLimit = (
  policy: Partial<RateLimitPolicy>
): ReturnType<typeof SetMetadata> => SetMetadata(RATE_LIMIT_POLICY_KEY, policy);

export const SkipRateLimit = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(RATE_LIMIT_SKIP_KEY, true);
