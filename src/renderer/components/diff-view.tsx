interface DiffViewProps {
  diff?: string;
}

export function DiffView({ diff }: DiffViewProps) {
  if (!diff) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
        <p>No diff to display. Click a diff in the chat to view changes.</p>
      </div>
    );
  }

  const lines = diff.split("\n");

  return (
    <div className="h-full overflow-auto font-mono text-xs leading-relaxed">
      <div className="p-2">
        {lines.map((line, i) => {
          let className = "px-2 whitespace-pre";
          if (line.startsWith("+")) className += " bg-accent/10 text-accent";
          else if (line.startsWith("-")) className += " bg-destructive/10 text-destructive";
          else if (line.startsWith("@@")) className += " text-info";
          else className += " text-muted-foreground";

          return (
            <div key={i} className={className}>
              {line || " "}
            </div>
          );
        })}
      </div>
    </div>
  );
}
