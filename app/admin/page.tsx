import { ownerUser } from '@/lib/owner';
import Admin from './workspace';
import Login from './login';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = await ownerUser();

  return user
    ? <Admin name={user.displayName} />
    : <Login />;
}
