'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import type { Repo } from '@/lib/api';

interface RepoSettingsFormProps {
  repo: Repo;
  action: (formData: FormData) => Promise<void>;
}

export function RepoSettingsForm({ repo, action }: RepoSettingsFormProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(() => action(formData))}
      className="flex flex-col gap-4"
    >
      <label className="flex flex-col gap-1">
        <span className="text-label-md text-ink">Default branch</span>
        <input
          name="defaultBranch"
          defaultValue={repo.defaultBranch}
          className="rounded-sm border border-hairline px-3 py-2 text-body-md"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-label-md text-ink">Flaky tests</span>
        <span className="text-body-sm text-muted">
          One test file path per line. Not consumed by the gate yet -- this only records the list
          for now.
        </span>
        <textarea
          name="flakyTests"
          rows={4}
          defaultValue={repo.settings?.flakyTests?.join('\n') ?? ''}
          placeholder="src/flaky.test.ts"
          className="rounded-sm border border-hairline px-3 py-2 font-mono text-body-sm"
        />
      </label>

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save settings'}
        </Button>
      </div>
    </form>
  );
}
