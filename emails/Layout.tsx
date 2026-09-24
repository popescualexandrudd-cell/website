import type { ReactNode } from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Link,
} from "react-email";

const colors = {
  nisip: "#F6EFE6",
  paper: "#FCF8F3",
  cerneala: "#2A1A12",
  cerneala2: "#5E4638",
  zgura: "#B94C22",
  zguraAdanc: "#9A3D19",
  linie: "#E6D6C2",
};

const display = "'Barlow Condensed', 'Arial Narrow', Arial, sans-serif";
const sans = "Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

export function EmailLayout(props: {
  lang: string;
  preview: string;
  title: string;
  ornamentUrl: string;
  brand: string;
  footer: string;
  children: ReactNode;
}) {
  return (
    <Html lang={props.lang}>
      <Head />
      <Preview>{props.preview}</Preview>
      <Body
        style={{
          backgroundColor: colors.nisip,
          margin: 0,
          padding: "32px 0",
          fontFamily: sans,
          color: colors.cerneala,
        }}
      >
        <Container
          style={{
            maxWidth: 560,
            backgroundColor: colors.paper,
            padding: "40px 36px",
            border: `1px solid ${colors.linie}`,
            borderTop: `6px solid ${colors.zgura}`,
          }}
        >
          <Img
            src={props.ornamentUrl}
            width="28"
            height="28"
            alt=""
            style={{ margin: "0 0 20px" }}
          />
          <Heading
            as="h1"
            style={{
              fontFamily: display,
              fontWeight: 700,
              fontSize: 34,
              lineHeight: "1",
              margin: "0 0 20px",
              letterSpacing: "0.01em",
              textTransform: "uppercase",
            }}
          >
            {props.title}
          </Heading>
          {props.children}
          <Hr style={{ borderColor: colors.linie, margin: "32px 0 16px" }} />
          <Text style={{ fontSize: 12, lineHeight: "1.5", color: colors.cerneala2, margin: 0 }}>
            {props.brand}
            <br />
            {props.footer}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function P({ children }: { children: ReactNode }) {
  return (
    <Text style={{ fontSize: 16, lineHeight: "1.6", margin: "0 0 16px", color: colors.cerneala }}>
      {children}
    </Text>
  );
}

export function DetailRows({ rows }: { rows: [string, string][] }) {
  return (
    <Section style={{ margin: "8px 0 24px", borderTop: `1px solid ${colors.linie}` }}>
      {rows.map(([label, value]) => (
        <Text
          key={label}
          style={{
            fontSize: 15,
            lineHeight: "1.5",
            margin: 0,
            padding: "10px 0",
            borderBottom: `1px solid ${colors.linie}`,
          }}
        >
          <span style={{ color: colors.cerneala2, display: "inline-block", minWidth: 120 }}>
            {label}
          </span>
          <strong style={{ fontWeight: 500 }}>{value}</strong>
        </Text>
      ))}
    </Section>
  );
}

export function PrimaryButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      href={href}
      style={{
        backgroundColor: colors.zgura,
        color: "#FFF7EE",
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "14px 22px",
        borderRadius: 4,
        textDecoration: "none",
        display: "inline-block",
        margin: "0 8px 12px 0",
      }}
    >
      {children}
    </Button>
  );
}

export function SecondaryButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      href={href}
      style={{
        backgroundColor: "transparent",
        color: colors.cerneala,
        border: `2px solid ${colors.cerneala}`,
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "12px 20px",
        borderRadius: 4,
        textDecoration: "none",
        display: "inline-block",
        margin: "0 8px 12px 0",
      }}
    >
      {children}
    </Button>
  );
}

export function QuietLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      style={{ color: colors.zguraAdanc, textDecoration: "underline", fontSize: 15 }}
    >
      {children}
    </Link>
  );
}
