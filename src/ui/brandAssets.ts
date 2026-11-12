import { ImageSourcePropType } from 'react-native';

/**
 * Stanford Block S (with tree) logo, shown in Settings → About when set.
 *
 * Use ONLY official artwork from Stanford, in the version SENSA's approval
 * covers (and the reversed/white version for dark mode). Never recreate,
 * recolor, stretch, outline or add effects, and never combine it with another
 * logo (keep it separate from SENSA's logo). Not used in the app icon.
 *
 * To enable: add the files to assets/brand/ and set, for example:
 *   export const STANFORD_LOGO = {
 *     light: require('../../assets/brand/stanford-block-s.png'),
 *     dark: require('../../assets/brand/stanford-block-s-reversed.png'),
 *   };
 */
export const STANFORD_LOGO: { light: ImageSourcePropType; dark: ImageSourcePropType } | null = null;
