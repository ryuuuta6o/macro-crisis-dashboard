import { Animated3DCard } from "@/components/Animated3DCard";

export function TiltCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Animated3DCard className={className} intensity={5} lift={8}>
      {children}
    </Animated3DCard>
  );
}
