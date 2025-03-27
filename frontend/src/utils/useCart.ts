import { create } from "zustand";

export type CartItem = {
    id: number;
    part_number: string;
    name: string;
    price: number;
    quantity: number;
};

type CartState = {
    cartItems: CartItem[];
    addToCart: (item: CartItem) => void;
    updateQuantity: (id: number, quantity: number) => void;
    removeFromCart: (id: number) => void;
    clearCart: () => void;
};

export const useCart = create<CartState>((set) => {
    const storedCart = localStorage.getItem("cart");
    const initialCart: CartItem[] = storedCart ? JSON.parse(storedCart) : [];

    const updateLocalStorage = (cart: CartItem[]) => {
        localStorage.setItem("cart", JSON.stringify(cart));
    };

    return {
        cartItems: initialCart,

        addToCart: (item) =>
            set((state) => {
                const existingItem = state.cartItems.find((i) => i.id === item.id);
                let updatedCart;
                if (existingItem) {
                    updatedCart = state.cartItems.map((i) =>
                        i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
                    );
                } else {
                    updatedCart = [...state.cartItems, item];
                }
                updateLocalStorage(updatedCart);
                return { cartItems: updatedCart };
            }),

        updateQuantity: (id, quantity) =>
            set((state) => {
                const updatedCart = state.cartItems.map((item) =>
                    item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
                );
                updateLocalStorage(updatedCart);
                return { cartItems: updatedCart };
            }),

        removeFromCart: (id) =>
            set((state) => {
                const updatedCart = state.cartItems.filter((item) => item.id !== id);
                updateLocalStorage(updatedCart);
                return { cartItems: updatedCart };
            }),

        clearCart: () =>
            set(() => {
                updateLocalStorage([]);
                return { cartItems: [] };
            }),
    };
});
