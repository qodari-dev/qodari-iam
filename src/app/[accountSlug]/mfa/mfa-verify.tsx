'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { api } from '@/clients/api';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/i18n/provider';
import { getTsRestErrorMessage } from '@/utils/get-ts-rest-error-message';
import { Mail } from 'lucide-react';
import Link from 'next/link';

interface MfaVerifyProps {
  accountSlug: string;
  appSlug: string;
  mfaToken: string;
  maskedEmail: string;
  redirect?: string;
}

const RESEND_COOLDOWN_SECONDS = 60;

export default function MfaVerify({
  accountSlug,
  appSlug,
  mfaToken,
  maskedEmail,
  redirect,
}: MfaVerifyProps) {
  const router = useRouter();
  const { locale, messages } = useI18n();
  const [code, setCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const { mutateAsync: verifyMfa, isPending: isVerifying } = api.auth.mfaVerify.useMutation({
    onError(error) {
      toast.error(messages.common.error, {
        description: getTsRestErrorMessage(error, locale),
      });
      setCode('');
    },
  });

  const { mutateAsync: resendMfa, isPending: isResending } = api.auth.mfaResend.useMutation({
    onSuccess(data) {
      toast.success(messages.auth.mfa.codeSent, {
        description: getTsRestErrorMessage({ message: data.body.message }, locale),
      });
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    },
    onError(error) {
      toast.error(messages.common.error, {
        description: getTsRestErrorMessage(error, locale),
      });
    },
  });

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const onSubmit = useCallback(async () => {
    if (code.length !== 6) return;

    const result = await verifyMfa({
      body: {
        mfaToken,
        code,
        accountSlug,
        appSlug,
      },
    });

    if (result.status === 200) {
      const next = redirect ?? `/${accountSlug}/portal`;
      router.push(next);
    }
  }, [code, verifyMfa, mfaToken, accountSlug, appSlug, redirect, router]);

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return;

    await resendMfa({
      body: {
        mfaToken,
        accountSlug,
        appSlug,
      },
    });
  }, [resendMfa, mfaToken, accountSlug, appSlug, resendCooldown]);

  // Auto-submit when code is complete
  useEffect(() => {
    if (code.length === 6) {
      onSubmit();
    }
  }, [code, onSubmit]);

  const loginUrl = `/${accountSlug}/login${appSlug ? `?app=${appSlug}` : ''}`;

  return (
    <AuthLayout accountSlug={accountSlug} appSlug={appSlug} variant="centered">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="bg-muted flex size-12 items-center justify-center rounded-full">
          <Mail className="text-muted-foreground size-6" />
        </div>
        <h1 className="text-2xl font-bold">{messages.auth.mfa.title}</h1>
        <p className="text-muted-foreground text-sm text-balance">
          {messages.auth.mfa.description} <span className="font-medium">{maskedEmail}</span>
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <InputOTP maxLength={6} value={code} onChange={setCode} disabled={isVerifying} autoFocus>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>

        <Button onClick={onSubmit} className="w-full" disabled={code.length !== 6 || isVerifying}>
          {isVerifying ? (
            <div className="flex items-center justify-center gap-2">
              <Spinner className="h-4 w-4" />
              <span>{messages.auth.mfa.verifying}</span>
            </div>
          ) : (
            messages.auth.mfa.verify
          )}
        </Button>

        <div className="text-muted-foreground flex flex-col items-center gap-2 text-sm">
          <span>
            {`${messages.auth.mfa.notReceived} `}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || isResending}
              className="text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isResending
                ? messages.auth.mfa.sending
                : resendCooldown > 0
                  ? `${messages.auth.mfa.resendIn} ${resendCooldown}s`
                  : messages.auth.mfa.resend}
            </button>
          </span>
        </div>

        <Button variant="link" asChild>
          <Link href={loginUrl}>{messages.auth.mfa.backToLogin}</Link>
        </Button>
      </div>
    </AuthLayout>
  );
}
