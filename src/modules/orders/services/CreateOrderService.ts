import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

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

    const allProducts = await this.productsRepository.findAllById(products);

    const productList = allProducts.map(prod => {
      const quantity = products.find(prodFind => prodFind.id === prod.id)
        ?.quantity;

      if (!quantity) {
        throw new AppError('product not found');
      }

      const product = {
        product_id: prod.id,
        price: prod.price * quantity,
        quantity,
      };

      return product;
    });

    const order = await this.ordersRepository.create({
      customer,
      products: productList,
    });

    return order;
  }
}

export default CreateOrderService;
