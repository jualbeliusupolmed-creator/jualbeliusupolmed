import { redirect } from 'next/navigation';

export default function BlogRedirect() {
  redirect('/mading?tab=blog');
}
