import { Redirect, useLocalSearchParams } from 'expo-router';

import { normalizeFriendCode } from '../../src/cloud/friendCode';

/** Invite links (flowstate://add-friend/ABCDEFGH) open the Add friends screen with the code filled in. */
export default function AddFriendLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <Redirect href={{ pathname: '/friends/add', params: { code: normalizeFriendCode(code ?? '') } }} />;
}
