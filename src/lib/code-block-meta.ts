interface CodeBlockMeta {
  icon: string;
}

const codeBlockMetaByFiletype: Record<string, CodeBlockMeta> = {
  bash: { icon: "" },
  c: { icon: "" },
  cpp: { icon: "" },
  csharp: { icon: "󰌛" },
  css: { icon: "" },
  diff: { icon: "" },
  dockerfile: { icon: "󰡨" },
  fish: { icon: "" },
  go: { icon: "" },
  hcl: { icon: "󱁢" },
  html: { icon: "󰌝" },
  java: { icon: "󰬷" },
  javascript: { icon: "󰌞" },
  javascriptreact: { icon: "" },
  json: { icon: "󰘦" },
  kotlin: { icon: "" },
  lua: { icon: "" },
  mermaid: { icon: "󰫺" },
  php: { icon: "" },
  python: { icon: "󰌠" },
  rego: { icon: "󰫿" },
  ruby: { icon: "" },
  rust: { icon: "" },
  scala: { icon: "" },
  sql: { icon: "" },
  shell: { icon: "" },
  sh: { icon: "" },
  text: { icon: "󰦪" },
  toml: { icon: "" },
  typescript: { icon: "󰛦" },
  typescriptreact: { icon: "" },
  yaml: { icon: "" },
  yml: { icon: "" },
  zig: { icon: "" },
  zsh: { icon: "" },
};

const defaultCodeBlockMeta: CodeBlockMeta = {
  icon: "󰈙",
};

export function getCodeBlockMeta(filetype: string): CodeBlockMeta {
  return codeBlockMetaByFiletype[filetype] ?? defaultCodeBlockMeta;
}
