'use server';

import { z } from 'zod';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { FormSchema } from '../types';
import { cookies } from 'next/headers';
import db from '../supabase/db';
import { users } from '../../../migrations/schema';
import { getURL } from '../utils';

export async function actionLoginUser({
  email,
  password,
}: z.infer<typeof FormSchema>) {
  const supabase = createServerActionClient({ cookies });
  const response = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return response;
}

export async function actionSignUpUser({
  email,
  password,
}: z.infer<typeof FormSchema>) {
  const supabase = createServerActionClient({ cookies });
  const existingUser = await db.query.users.findFirst({
    where: (user, { eq }) => eq(user.email, email),
  });

  if (existingUser) {
    return {
      data: { user: null, session: null },
      error: { message: 'User already exists', data: existingUser },
    };
  }

  const response = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getURL()}api/auth/callback`,
    },
  });

  if (response.data.user) {
    await db.insert(users).values({
      id: response.data.user.id,
      email: response.data.user.email,
    });
  }

  return response;
}
