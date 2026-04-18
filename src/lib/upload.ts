export const UPLOAD_TYPE_VALUES = [
  'account-logo',
  'account-image-ad',
  'application-logo',
  'application-image',
  'application-image-ad',
] as const;

export type UploadType = (typeof UPLOAD_TYPE_VALUES)[number];

export const ACCOUNT_LOGO_UPLOAD_TYPE: UploadType = 'account-logo';
export const ACCOUNT_IMAGE_AD_UPLOAD_TYPE: UploadType = 'account-image-ad';
export const APPLICATION_LOGO_UPLOAD_TYPE: UploadType = 'application-logo';
export const APPLICATION_IMAGE_UPLOAD_TYPE: UploadType = 'application-image';
export const APPLICATION_IMAGE_AD_UPLOAD_TYPE: UploadType = 'application-image-ad';

export function getResourcePathForUploadType(uploadType: UploadType): string {
  switch (uploadType) {
    case ACCOUNT_LOGO_UPLOAD_TYPE:
      return 'account-logo';
    case ACCOUNT_IMAGE_AD_UPLOAD_TYPE:
      return 'account-image-ad';
    case APPLICATION_LOGO_UPLOAD_TYPE:
      return 'application-logo';
    case APPLICATION_IMAGE_UPLOAD_TYPE:
      return 'application-image';
    case APPLICATION_IMAGE_AD_UPLOAD_TYPE:
      return 'application-image-ad';
  }

  throw new Error(`Unsupported upload type: ${uploadType}`);
}
