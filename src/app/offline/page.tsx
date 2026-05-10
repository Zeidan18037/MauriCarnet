export default function Offline() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="text-6xl mb-4">📡</div>
      <h1 className="text-2xl font-bold mb-2">Pas de connexion</h1>
      <p className="text-lg mb-6">
        Les données sont sauvegardées localement.
        Elles seront synchronisées automatiquement dès que la connexion sera rétablie.
      </p>
    </div>
  );
}
