import { writeFile } from "node:fs/promises";
import { createElement as h } from "react";
import { fontsourceFontLoader } from "metaplate/fonts";
import { createNodeOg } from "metaplate/node";

const copy = {
  alt: "lnorton89 GitHub build log",
  eyebrow: "github.com/lnorton89",
  title: "build log",
  subtitle: "what I'm building right now",
};

const og = createNodeOg({
  alt: (value) => value.alt,
  fonts: fontsourceFontLoader([{ font: "inter", weight: 700 }]),
  component: (value) =>
    h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#0b0d12",
          color: "#f2f5f7",
          fontFamily: "Inter",
          padding: 80,
        },
      },
      h("div", { style: { display: "flex", color: "#55d6be", fontSize: 30 } }, value.eyebrow),
      h("div", { style: { display: "flex", marginTop: 24, fontSize: 72 } }, value.title),
      h(
        "div",
        { style: { display: "flex", marginTop: 28, color: "#9aa5b1", fontSize: 30 } },
        value.subtitle
      )
    ),
});

await writeFile("public/og-image.png", await og.render(copy));
