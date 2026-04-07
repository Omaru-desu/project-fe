import { logout } from "../login/actions";

export default function Dashboard() {
    return (
        <div className="min-h-screen bg-[#f7fafc] flex items-center justify-center">
            <div className="bg-white rounded-[20px] p-10 text-center border border-[rgba(0,90,140,0.13)] shadow-[0_2px_16px_rgba(0,60,100,0.09)]">
                <div className="text-[1.8rem] font-black text-[#0d1f2d] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Welcome back 🌊
                </div>
                <p className="text-[0.85rem] text-[#4a6880] mb-8">
                    You&apos;re signed in to Omaru.
                </p>
                <form action={logout}>
                    <button
                        type="submit"
                        className="px-8 py-3 rounded-[10px] bg-[#0d1f2d] text-white text-[0.88rem] font-bold cursor-pointer transition-all duration-300 hover:bg-gradient-to-br hover:from-[#006d9e] hover:to-[#00b4a0] border-none"
                        style={{ fontFamily: "'Raleway', sans-serif" }}
                    >
                        Logout
                    </button>
                </form>
            </div>
        </div>
    );
}