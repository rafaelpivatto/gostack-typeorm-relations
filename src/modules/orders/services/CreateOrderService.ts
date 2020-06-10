import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import IUpdateProductsQuantityDTO from '@modules/products/dtos/IUpdateProductsQuantityDTO';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';
import ICreateOrderDTO from '../dtos/ICreateOrderDTO';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found');
    }

    const allStockedProducts = await this.productsRepository.findAllById(
      products,
    );

    if (!allStockedProducts || allStockedProducts.length !== products.length) {
      throw new AppError('Invalid product in list');
    }

    const productsToUpdate: IUpdateProductsQuantityDTO[] = [];
    const orderedProducts: ICreateOrderDTO = {
      customer,
      products: [],
    };

    allStockedProducts.forEach(CurrentStockProduct => {
      const orderedQuantity = products.find(
        orderProduct => orderProduct.id === CurrentStockProduct.id,
      )?.quantity;

      if (!orderedQuantity) {
        throw new AppError('Product ordered not found');
      }

      if (CurrentStockProduct.quantity - orderedQuantity < 0) {
        throw new AppError('Insuficient quantity for the product');
      }

      productsToUpdate.push({
        ...CurrentStockProduct,
        quantity: CurrentStockProduct.quantity - orderedQuantity,
      });

      orderedProducts.products.push({
        product_id: CurrentStockProduct.id,
        price: CurrentStockProduct.price,
        quantity: orderedQuantity,
      });
    });

    await this.productsRepository.updateQuantity(productsToUpdate);

    const order = await this.ordersRepository.create(orderedProducts);

    return order;
  }
}

export default CreateOrderService;
