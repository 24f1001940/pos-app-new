import * as SeparatorPrimitive from '@radix-ui/react-separator'

export function Separator(props) {
  return (
    <SeparatorPrimitive.Root
      className="h-px w-full bg-border"
      orientation="horizontal"
      decorative
      {...props}
    />
  )
}
