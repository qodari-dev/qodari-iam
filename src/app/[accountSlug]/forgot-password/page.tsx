import ForgetPassword from './forget-password';

export default async function ForgotPasswordPage({
  params,
}: PageProps<'/[accountSlug]/forgot-password'>) {
  const { accountSlug } = await params;
  return <ForgetPassword accountSlug={accountSlug} />;
}
