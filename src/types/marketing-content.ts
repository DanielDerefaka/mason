export interface ServiceCard {
  title: string;
  /** One sentence under the title; the card is a glass tile, not a label. */
  description: string;
  icon:
    | "globe"
    | "edit"
    | "cart"
    | "bars"
    | "plane"
    | "puzzle"
    | "bolt"
    | "navigation"
    | "rocket"
    | "tools";
}

export interface ApproachStep {
  title: string;
  /** Section heading in two runs: the lead sits grey, the emphasis sits white. */
  headline: [string, string];
  /** Paragraph split into runs so the reference's inline bolding is preserved. */
  body: { text: string; bold?: boolean }[];
  visual:
    | "marquee"
    | "phones"
    | "dashboard"
    | "editor"
    | "cms-table"
    | "clock";
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  category: string;
  readTime: string;
  cover: string;
  body: string[];
}
