interface CodeBlockMeta {
  icon: string;
}

const codeBlockMetaByFiletype: Record<string, CodeBlockMeta> = {
  bash: { icon: "" },
  fish: { icon: "" },
  java: { icon: "" },
  javascript: { icon: "" },
  javascriptreact: { icon: "" },
  json: { icon: "" },
  python: { icon: "" },
  rego: { icon: "󱁢" },
  shell: { icon: "" },
  sh: { icon: "" },
  text: { icon: "󰈙" },
  typescript: { icon: "" },
  typescriptreact: { icon: "" },
  yaml: { icon: "" },
  yml: { icon: "" },
  zsh: { icon: "" },
};

const defaultCodeBlockMeta: CodeBlockMeta = {
  icon: "󰈙",
};

export function getCodeBlockMeta(filetype: string): CodeBlockMeta {
  return codeBlockMetaByFiletype[filetype] ?? defaultCodeBlockMeta;
}
