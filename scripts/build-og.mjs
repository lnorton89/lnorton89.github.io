import { writeFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { createElement as h } from "react";
import { fontsourceFontLoader } from "metaplate/fonts";
import { createNodeOg } from "metaplate/node";

const snapshot = JSON.parse(await readFile("public/data/github.json", "utf8"));
const { profile, feed, topRepos, languageTotals, contributions } = snapshot;
const languages = Object.entries(languageTotals).sort((a, b) => b[1] - a[1]).slice(0, 4);
const languageTotal = languages.reduce((sum, [, bytes]) => sum + bytes, 0);

let avatarSrc;
try {
  const avatar = await fetch(profile.avatarUrl);
  if (!avatar.ok) throw new Error(`avatar request failed: ${avatar.status}`);
  avatarSrc = `data:image/jpeg;base64,${Buffer.from(await avatar.arrayBuffer()).toString("base64")}`;
} catch (error) {
  console.warn(`Could not embed profile avatar: ${error.message}`);
}

const copy = {
  alt: `${profile.login} GitHub activity`,
  profile,
  feed,
  topRepos,
  languages,
  languageTotal,
  avatarSrc,
  contributions,
};

const og = createNodeOg({
  alt: (value) => value.alt,
  fonts: fontsourceFontLoader([
    { font: "inter", weight: 400 },
    { font: "inter", weight: 700 },
  ]),
  component: (value) =>
    h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0a0b0d",
          color: "#f2f5f7",
          fontFamily: "Inter",
          padding: 54,
          position: "relative",
        },
      },
      h(
        "div",
        { style: { position: "absolute", top: 0, left: 0, width: 1200, height: 8, display: "flex", background: "#3ddad7" } }
      ),
      h(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 18 } },
        value.avatarSrc
          ? h("img", { src: value.avatarSrc, width: 76, height: 76, style: { borderRadius: 38, border: "3px solid #3ddad7" } })
          : h("div", { style: { width: 76, height: 76, borderRadius: 38, display: "flex", background: "#1f6d6b" } }),
        h(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: 5 } },
          h("div", { style: { display: "flex", fontSize: 18, color: "#3ddad7" } }, `github.com/${value.profile.login}`),
          h("div", { style: { display: "flex", fontSize: 46, fontWeight: 700 } }, `${value.profile.name || value.profile.login}.`)
        ),
        h("div", { style: { display: "flex", marginLeft: "auto", alignItems: "center", gap: 8, color: "#e8a33d", fontSize: 16 } },
          h("div", { style: { width: 10, height: 10, borderRadius: 5, display: "flex", background: "#e8a33d" } }),
          "BUILDING NOW"
        )
      ),
      h(
        "div",
        { style: { display: "flex", gap: 18, marginTop: 34, flex: 1 } },
        h(
          "div",
          { style: { display: "flex", flexDirection: "column", width: 525 } },
          h("div", { style: { display: "flex", fontSize: 14, color: "#8b8f98" } }, "RECENTLY ACTIVE"),
          ...value.topRepos.slice(0, 3).map((repo) =>
            h("div", { key: repo.fullName, style: { display: "flex", flexDirection: "column", marginTop: 12, padding: "13px 16px", border: "1px solid #24272e", borderRadius: 8, background: "#131519" } },
              h("div", { style: { display: "flex", fontSize: 19, fontWeight: 700, color: "#e8e6e1" } }, repo.name),
              h("div", { style: { display: "flex", marginTop: 5, fontSize: 13, color: "#8b8f98" } }, repo.description || "Active GitHub repository")
            )
          )
        ),
        h(
          "div",
          { style: { display: "flex", flexDirection: "column", flex: 1, marginTop: 29, marginBottom: 16, padding: "18px 20px", border: "1px solid #24272e", borderRadius: 10, background: "#131519" } },
          h("div", { style: { display: "flex", color: "#3ddad7", fontSize: 14 } }, `$ gh activity --user ${value.profile.login}`),
          ...value.feed.slice(0, 4).map((item) =>
            h("div", { key: item.id, style: { display: "flex", marginTop: 14, fontSize: 14, color: "#e8e6e1" } },
              h("div", { style: { display: "flex", width: 7, height: 7, margin: "6px 10px 0 0", borderRadius: 4, background: item.type === "PushEvent" ? "#3ddad7" : "#e8a33d" } }),
              `${item.repo.split("/").pop()} · ${item.detail || item.summary}`
            )
          )
        )
      ),
      h(
        "div",
        { style: { display: "flex", alignItems: "flex-end", gap: 30, marginTop: 20, borderTop: "1px solid #24272e", paddingTop: 16 } },
        h("div", { style: { display: "flex", gap: 28, fontSize: 15, color: "#8b8f98" } },
          h("div", { style: { display: "flex", flexDirection: "column", gap: 3 } }, h("b", { style: { color: "#e8e6e1", fontSize: 25 } }, profile.publicRepos), "PUBLIC REPOS"),
          h("div", { style: { display: "flex", flexDirection: "column", gap: 3 } }, h("b", { style: { color: "#e8e6e1", fontSize: 25 } }, profile.followers), "FOLLOWERS"),
          h("div", { style: { display: "flex", flexDirection: "column", gap: 3 } }, h("b", { style: { color: "#e8e6e1", fontSize: 25 } }, contributions?.contributionCalendar.totalContributions?.toLocaleString() || "—"), "CONTRIBUTIONS")
        ),
        h("div", { style: { display: "flex", flex: 1, flexDirection: "column", gap: 7 } },
          h("div", { style: { display: "flex", fontSize: 13, color: "#8b8f98" } }, "LANGUAGES IN PLAY"),
          h("div", { style: { display: "flex", height: 10, borderRadius: 5, overflow: "hidden" } },
            ...value.languages.map(([name, bytes]) => h("div", { key: name, style: { display: "flex", flex: bytes / value.languageTotal, background: ({ TypeScript: "#4f8cff", JavaScript: "#f0c75e", Go: "#00add8", Rust: "#d77a61" })[name] || "#3ddad7" } }))
          )
        )
      )
    ),
});

await writeFile("public/og-image.png", await og.render(copy));
