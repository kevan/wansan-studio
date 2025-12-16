import { useTypewriter } from '../../hooks/use-typewriter';
import { cn } from '../../utils/cn';

interface TypewriterBlockProps {
  content: string;
  className?: string;
  onFinish?: () => void;
}

export function TypewriterBlock({ content, className, onFinish }: TypewriterBlockProps) {
  const { displayedText, isComplete } = useTypewriter(content, 15, onFinish);

  return (
    <div className={cn("font-mono text-xs whitespace-pre-wrap", className)}>
      {displayedText}
      {!isComplete && <span className="animate-pulse inline-block w-2 h-4 bg-indigo-500 ml-1 align-middle"></span>}
    </div>
  )
}
