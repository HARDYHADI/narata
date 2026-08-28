interface ContentForChunk {
  canonicalTitle: string;
  originalTitle: string | null;
  synopsisShort: string | null;
  genreNames: string[];
  releaseDate: string | null;
  director: string | null;
  castNames: string[] | null;
}

export function buildWorkSummaryChunkText(content: ContentForChunk): string {
  const lines = [
    content.canonicalTitle,
    content.originalTitle ? `원제: ${content.originalTitle}` : null,
    content.releaseDate ? `개봉일: ${content.releaseDate}` : null,
    content.genreNames.length > 0
      ? `장르: ${content.genreNames.join(", ")}`
      : null,
    content.director ? `감독: ${content.director}` : null,
    content.castNames && content.castNames.length > 0
      ? `출연: ${content.castNames.join(", ")}`
      : null,
    content.synopsisShort,
  ].filter((line): line is string => Boolean(line));

  return lines.join("\n");
}
