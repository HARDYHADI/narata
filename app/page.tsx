import Link from "next/link";
import SupabaseStatus from "./supabase-status";

export default function Home() {
  return (
    <main>
      <h1>narata</h1>
      <SupabaseStatus />
      <nav className="home-nav">
        <Link href="/movies">영화 둘러보기</Link>
      </nav>
    </main>
  );
}
