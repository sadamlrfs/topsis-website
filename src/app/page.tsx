"use client";

export default function HomePage() {
  return (
    <div className="h-full flex items-center justify-center text-center px-8">
      <div>
        <div className="text-4xl mb-4">📊</div>
        <h2 className="text-lg font-semibold text-gray-700">
          Selamat datang di TOPSIS WEBSITE
        </h2>
        <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">
          Pilih project dari sidebar kiri, atau buat project baru untuk mulai
          menghitung.
        </p>
      </div>
    </div>
  );
}
