import Image from "next/image"

export default function HeroPage() {
    return (
        <div className="relative w-full h-screen overflow-hidden rounded-[40px]">
            <Image
                src="/hero-img.png"
                alt="Hero AUMS"
                fill
                priority
                unoptimized
                className="object-cover object-center"
            />

            <div className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" />

            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent" />

            <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4 p-8 text-center text-white">
                <h1 className="text-4xl font-bold md:text-6xl">SELAMAT DATANG DI AUMS</h1>
                <p className="max-w-2xl text-base md:text-xl text-white/90">
                    Sistem pelaporan cerdas berbasis lokasi. Cukup ambil foto, dan biarkan teknologi kami memverifikasi serta meneruskannya ke dinas terkait untuk penanganan instan.
                </p>
            </div>
        </div>
    )
}