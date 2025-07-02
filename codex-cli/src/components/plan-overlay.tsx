import { Box, Text } from "ink";
import React, { useState } from "react";
import { useInput } from "ink";
import TextInput from "./vendor/ink-text-input.js";

type Props = {
  onSubmit: (objective: string) => void;
  onExit: () => void;
};

export default function PlanOverlay({ onSubmit, onExit }: Props): JSX.Element {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const slug = value.trim();
    if (!slug) {
      setError("Objective name cannot be empty");
      return;
    }
    if (!/^[a-z0-9\-]+$/.test(slug)) {
      setError("Use lowercase letters, numbers, and hyphens only");
      return;
    }
    onSubmit(slug);
  };

  // Ink's TextInput uses Enter key to submit.
  useInput((_input, key) => {
    if (key.escape) {
      onExit();
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Text>
        Create or open plan – objective name (kebab-case, e.g. add-oauth-login):
      </Text>
      <TextInput value={value} onChange={setValue} onSubmit={handleSubmit} />
      {error && (
        <Text color="redBright">{error}</Text>
      )}
      <Box marginTop={1}>
        <Text dimColor>esc Cancel</Text>
      </Box>
    </Box>
  );
}
