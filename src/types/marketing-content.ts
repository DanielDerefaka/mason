export interface ServiceCard {
  /** Two-line label, exactly as the reference splits it. */
  lines: [string, string];
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
  /** Index into the accent list the drawn cover cycles through. */
  coverIndex: number;
  body: string[];
}
