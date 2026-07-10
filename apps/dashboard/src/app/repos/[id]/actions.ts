'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { updateRepo } from '@/lib/api';
import { auth } from '@/lib/auth';

export async function updateRepoSettingsAction(id: string, formData: FormData): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/');

  const defaultBranch = String(formData.get('defaultBranch') ?? '').trim();
  const flakyTestsRaw = String(formData.get('flakyTests') ?? '');
  const flakyTests = flakyTestsRaw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  await updateRepo(id, {
    ...(defaultBranch ? { defaultBranch } : {}),
    settings: { flakyTests },
  });

  revalidatePath(`/repos/${id}`);
}
