export function Equation({ children, n }: { children: React.ReactNode; n?: string }) {
  return (
    <div className="eq" role="math">
      <div className="eq-body">{children}</div>
      {n ? <span className="eq-n">({n})</span> : null}
    </div>
  );
}
