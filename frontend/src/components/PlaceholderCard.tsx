import type { ReactNode } from "react";

type PlaceholderCardProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function PlaceholderCard(props: PlaceholderCardProps) {
  return (
    <section
      style={{
        height: "100%",
        border: "1px solid #d8e2ee",
        borderRadius: 16,
        background: "#ffffff",
        padding: 16
      }}
    >
      <h3 style={{ marginTop: 0 }}>{props.title}</h3>
      <p style={{ color: "#64748b" }}>{props.description}</p>
      {props.children}
    </section>
  );
}
