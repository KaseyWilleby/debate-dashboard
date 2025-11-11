import data from './placeholder-images.json';

export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

// This is no longer used for user avatars, but can be kept for other images.
export const PlaceHolderImages: ImagePlaceholder[] = data.placeholderImages;
