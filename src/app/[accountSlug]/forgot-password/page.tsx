import ForgetPassword from './forget-password';

export default async function ForgotPasswordPage(
  props: PageProps<'/[accountSlug]/forgot-password'>
) {
  const { accountSlug } = await props.params;
  const search = await props.searchParams;

  const appSlug = (search.app as string) ?? undefined;

  return <ForgetPassword accountSlug={accountSlug} appSlug={appSlug} />;
}
