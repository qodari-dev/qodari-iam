import ForgetPassword from './forget-password';

type Props = {
  params: Promise<{ accountSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ForgotPasswordPage({ params, searchParams }: Props) {
  const { accountSlug } = await params;
  const search = await searchParams;
  const appSlug = (search.app as string) ?? undefined;

  return <ForgetPassword accountSlug={accountSlug} appSlug={appSlug} />;
}
