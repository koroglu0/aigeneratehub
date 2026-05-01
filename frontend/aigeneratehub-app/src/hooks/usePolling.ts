import { useQuery } from '@tanstack/react-query';
import { getGenerationStatus } from '../api/generate.api';
import { POLL_INTERVAL } from '../utils/constants';

export function usePolling(requestId: string | null) {
  return useQuery({
    queryKey: ['generationStatus', requestId],
    queryFn: () => getGenerationStatus(requestId!).then((r) => r.data),
    enabled: requestId !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'completed' || status === 'failed') return false;
      return POLL_INTERVAL;
    },
  });
}
