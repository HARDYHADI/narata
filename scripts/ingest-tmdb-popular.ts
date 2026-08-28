import { runTmdbPopularIngestion } from "../lib/ingestion/ingestTmdbPopular";

async function main() {
  const page = process.argv[2] ? Number(process.argv[2]) : 1;
  const results = await runTmdbPopularIngestion(page);

  for (const result of results) {
    if (result.error) {
      console.error(`failed tmdb:${result.tmdbId} - ${result.error}`);
    } else {
      console.log(`ingested "${result.title}" (tmdb:${result.tmdbId}) -> content:${result.contentId}`);
    }
  }
}

main()
  .then(() => {
    console.log("done.");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
