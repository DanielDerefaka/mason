import Link from "next/link";

import {
  ArrowRightIcon,
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  TwitterIcon,
} from "@/components/marketing/icons";
import { CONTACT, COPYRIGHT, FOOTER_COLUMNS, SOCIAL_LINKS } from "@/lib/marketing-nav";

const SOCIAL_ICONS = {
  Instagram: InstagramIcon,
  Facebook: FacebookIcon,
  Twitter: TwitterIcon,
  LinkedIn: LinkedInIcon,
} as const;

export function SiteFooter() {
  return (
    <footer className="border-hairline border-t">
      {/* Social bar — four cells split by hairline dividers. */}
      <div className="border-hairline grid grid-cols-1 border-b sm:grid-cols-2 lg:grid-cols-4">
        {SOCIAL_LINKS.map((social) => {
          const Icon = SOCIAL_ICONS[social.label as keyof typeof SOCIAL_ICONS];
          return (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noreferrer noopener"
              className="border-hairline text-muted-foreground hover:text-foreground group flex items-center justify-between border-b px-6 py-4 transition-colors duration-300 last:border-b-0 sm:border-r sm:[&:nth-child(2n)]:border-r-0 lg:border-r lg:border-b-0 lg:last:border-r-0 lg:[&:nth-child(2n)]:border-r"
            >
              <span className="flex items-center gap-2.5 text-[14px] leading-[22.4px]">
                <Icon className="h-4 w-4" />
                {social.label}
              </span>
              <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          );
        })}
      </div>

      {/* Link columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {FOOTER_COLUMNS.map((col) => (
          <div
            key={col.title}
            className="border-hairline border-b px-6 py-10 sm:border-r sm:[&:nth-child(2n)]:border-r-0 lg:border-r lg:[&:nth-child(2n)]:border-r"
          >
            <h3 className="text-muted-foreground mb-6 text-[14px] leading-[22.4px]">
              {col.title}
            </h3>
            <ul className="space-y-3">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-foreground/85 hover:text-foreground text-[14px] leading-[22.4px] transition-colors duration-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="border-hairline border-b px-6 py-10">
          <h3 className="text-muted-foreground mb-6 text-[14px] leading-[22.4px]">Contact</h3>
          <ul className="text-foreground/85 space-y-3 text-[14px] leading-[22.4px]">
            <li>
              Email:{" "}
              <a href={`mailto:${CONTACT.email}`} className="hover:text-foreground transition-colors">
                {CONTACT.email}
              </a>
            </li>
            <li>{CONTACT.location}</li>
          </ul>
        </div>
      </div>

      <div className="text-muted-foreground py-6 text-center text-[13px] leading-[20px]">
        {COPYRIGHT}
      </div>
    </footer>
  );
}
