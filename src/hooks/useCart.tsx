import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const newCart = [...cart];
      
      const indexCart = newCart.findIndex((product: Product) => product.id === productId);

      if(indexCart !== -1) {
        const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

        if(newCart[indexCart].amount >= stock.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        newCart[indexCart].amount += 1;
      }else {
        const { data: product } = await api.get(`/products/${productId}`);

        product.amount = 1;
        
        newCart.push(product);
      }

      setCart(newCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const indexCart = cart.findIndex(product => product.id === productId);

      if(indexCart === -1) {
        throw new Error();
      }

      const cartFiltered = cart.filter(product => product.id !== productId);

      setCart(cartFiltered);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartFiltered));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  }

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      
      if(amount <= 0) return;

      const newCart = [...cart];
      const indexCart = newCart.findIndex(product => product.id === productId);
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);
      
      if(amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      newCart[indexCart].amount = amount;

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
