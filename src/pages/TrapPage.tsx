import { Link } from 'react-router-dom';

export default function TrapPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-juxt-primary">Accès refusé</p>
      <h1 className="font-display mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
        Tu veux me <em className="italic text-juxt-primary">niquer</em> ?
        <br />
        Hexaro t sûr ?
      </h1>
      <p className="mt-4 max-w-md text-juxt-muted">Cette page n’existe pas. Reviens à l’accueil, champion.</p>
      <Link
        to="/"
        className="mt-8 inline-flex min-h-12 items-center rounded-full bg-juxt-primary px-6 font-extrabold text-black"
      >
        Retour à l’accueil
      </Link>
    </div>
  );
}
