# Gatherloop POS (Pint Of Sale)

## 1. Overviews

This project is a custom-built Point of Sale (POS) system designed specifically for use in my coffee shop, with support for both web and mobile platforms. The system provides essential features such as:

Menu Management: Register and update new menu items seamlessly.
Transaction Processing: Record customer transactions efficiently.
Automated Calculations: Automatically calculate costs and profits for each transaction.
Financial Management: Streamline operations by automating budget allocations for operational expenses, food costs, and profits.
This POS system aims to provide a comprehensive solution for managing business operations more efficiently, reducing manual work and improving financial transparency.

![screenshot of gatherloop POS](https://i.ibb.co.com/5KQJmMz/Screenshot-2024-11-28-at-14-39-36.png)

## 2. Features

### 2.1. Category Management

The Category Management feature organizes products into groups (e.g., beverage, food) for easier browsing and management. It simplifies sales tracking and inventory control, enhancing both customer experience and operational efficiency.

### 2.2. Product Management

The Product Management feature allows you to list, create, and update products while managing their materials. This ensures accurate cost tracking and helps in determining optimal pricing for each item.

### 2.3. Material Management

The Material Management feature tracks and manages the raw materials used in products. It helps monitor inventory levels, calculates material costs, and ensures accurate pricing based on the cost.

### 2.4. Transaction

The Transaction management feature records and tracks all customer purchases, ensuring accurate sales data. It simplifies the checkout process and automatically updates financial records, providing insights into daily sales and revenue.

### 2.5. Expense Tracking

The Expense Management feature tracks expenses across multiple categories, such as operational costs, material stock, and salaries. It helps allocate budgets for each category, ensuring accurate tracking and management of business expenditures.

### 2.6. Budget Tracking

The Budget Tracking feature helps monitor spending limits for various categories like restocking materials, salaries, and operational costs. It ensures better control over finances by providing real-time insights into available budgets for each expense.

## 3. Tech Stack

### 3.1. Golang

https://go.dev

Go (Golang) is used for building the backend services of the POS system. Its efficiency in handling concurrent processes ensures high performance, making it ideal for managing tasks like transaction processing, budget tracking, and real-time financial calculations. Go’s simplicity and speed contribute to the system's scalability and reliability.

### 3.2. React

https://react.dev

React is used for building the web interface of the POS system, providing a dynamic and responsive user experience. Its component-based architecture allows for efficient rendering and seamless updates, making tasks like product management, transaction handling, and expense tracking intuitive and easy to navigate.

### 3.3. React Native

https://reactnative.dev

React Native powers the mobile version of the POS system, enabling a consistent user experience across both iOS and Android platforms. With its reusable components and native performance, React Native ensures smooth navigation and real-time updates, allowing users to manage transactions, products, and expenses on the go.

### 3.4. Tamagui

https://tamagui.dev

Tamagui is used for building a cross-platform UI in the POS system, allowing for consistent design and performance across web and mobile. It simplifies the development process by sharing components between platforms, ensuring a cohesive look and feel while maintaining speed and responsiveness.

### 3.5. Open API

https://www.openapis.org

OpenAPI is used to define and document the POS system’s API, ensuring clear communication between the backend and frontend. It standardizes API endpoints, making integration more efficient and scalable while providing an easy-to-understand interface for developers to interact with the system’s features, such as transactions, product management, and budgeting.

## 4. Projects

This POS system is organized within an Nx monorepo, containing the following projects:

### 4.1. Web

The web project is the frontend application built with React, providing an intuitive and dynamic interface for managing various aspects of the POS system, such as transactions, product listings, and financial tracking. This project uses reusable UI components shared through the UI library, ensuring consistency and responsiveness across the platform.

To work on or run the web project in your local development environment, you can use the following commands:

#### A. Development Mode

```
$ nx run web:dev
```

This starts the development server, enabling live reload and hot reloading for a smooth development experience.

#### B. Build the Project

```
$ nx run web:build
```

This builds the web project for production, optimizing performance and bundling all assets.

#### C. Run the Built Project

```
$ nx run web:start
```

This command runs the production-ready version of the web project after it has been built.

### 4.2. Mobile

The mobile project is developed with React Native, providing a seamless user experience for managing the POS system on mobile devices. It shares UI components with the web project through the UI library, ensuring design consistency across platforms. This mobile app is compatible with both Android and iOS, allowing users to handle transactions, manage products, and monitor expenses from anywhere.

To run and build the mobile project for development or production, use the following commands:

#### A. Start React Native Development Server

```
$ nx run mobile:start
```

This launches the React Native development server, enabling live reload and debugging.

#### B. Run on Android Device

```
$ nx run mobile:run-android
```

This command runs the mobile project on a connected Android device or emulator.

#### C. Run on iOS Device

```
$ nx run mobile:run-ios
```

This runs the project on a connected iOS device or simulator.

#### D. Build for Android

```
$ nx run mobile:build-android
```

This builds the Android version of the mobile project for production.

#### E. Build for iOS

```
$ nx run mobile:build-ios
```

This builds the iOS version of the mobile project for production.

### 4.3. UI

The UI project is a shared component library designed for both web and mobile platforms. Built with Tamagui, it ensures a consistent and responsive user interface across the POS system. This project contains reusable components that are optimized for performance and flexibility, allowing you to easily maintain and scale the design system for both React and React Native applications.

### 4.4. API

The API project is the backend service of the POS system, built using Go (Golang). It handles core functionalities such as managing transactions, products, budgeting, and more, ensuring fast and reliable data processing. The API communicates with both the web and mobile applications through well-defined endpoints, documented via OpenAPI, making integration seamless and efficient.

Running the API Project

#### A. Run the Server

```
$ nx run api:serve
```

This command starts the Go server, allowing the API to handle requests from the web and mobile applications.

#### B. Build the API Binary

```
$ nx run api:build
```

This compiles the Go code into a binary file, preparing it for deployment in production environments.

### 4.5. API Contract

The API Contract project defines the specifications and types for the API endpoints, ensuring consistent communication between the backend and frontend applications. It serves as a bridge between the API and the client projects, generating type definitions that enhance type safety and reduce errors during development.

Running the API Contract Project

#### A. Generate TypeScript Typings

```
$ nx run api-contract:generate:ts
```

This command generates TypeScript typings that will be used in both the web and mobile projects, ensuring type safety and improving developer experience.

#### B. Generate Go Typings

```
$ nx run api-contract:generate:go
```

This command generates Go typings for the API project, aligning the backend data structures with the defined API specifications.

## 5. Clean Architecture

This POS system is built using Clean Architecture principles for both the backend and frontend, promoting separation of concerns and enhancing testability. By structuring the application into distinct layers, Clean Architecture allows for easier maintenance, scalability, and independent testing of each component.

### 5.1. Backend

![clean architecture backend](/docs/clean%20architecture%20be.png)

#### A. Domain Layer

The Domain layer is the core of the backend's clean architecture that define the data structure and business logic. There are some components in this layer :

1. `Entity`, defining the [data structure](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/apps/api/domain/transactions/entity.go#L19-L30) that used in the use cases
2. `Usecase`, implementing the specific [business logic](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/apps/api/domain/transactions/usecase.go#L28-L40)
3. `Repository Interface`, containing [interface](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/apps/api/domain/transactions/repository.go) that ensure the business logic remains independent of the data layer (e.g., databases, external API, or mock data)

This separation facilitates testing, allowing use cases and entities to be validated in isolation without relying on external systems, enhancing overall maintainability and scalability.

#### B. Data Layer

The Data Layer [implements the repository interfaces](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/apps/api/data/mysql/transactions/repository.go) required by the use cases, allowing for flexibility in how data is sourced and managed. By following these interfaces, the Data Layer can easily connect to various data sources, such as databases, mock data, or external APIs. This design promotes separation of concerns, enabling the backend's business logic to remain independent of the underlying data implementation.

#### C. Presentation Layer

The Presentation Layer contain [handler](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/apps/api/presentation/http/transactions/handler.go) that [consumes the use cases](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/apps/api/presentation/http/transactions/handler.go#L38) and [maps the internal data structures](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/apps/api/presentation/http/transactions/handler.go#L44-L47) from the entities to output formats, such as JSON for REST APIs. It also [map the request](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/apps/api/presentation/http/transactions/handler.go#L22-L36) from HTTP API to internal data structure

### 5.2. Frontend

![clean architecture frontend](/docs/clean%20architecture%20fe.png)

#### A. Domain Layer

The domain layer in frontend is similar like backend, it contains the following components :

1. `Entity`, defining the [internal data structures](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/libs/ui/src/domain/entities/Transaction.ts) used in the business logic
2. `Usecase`, implementing the business logic, utilizing a [finite state machine](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/libs/ui/src/domain/usecases/transactionList.ts#L80-L150) to map the current state to the next state based on received actions. Importantly, the use cases do not concern themselves with the data source, whether it comes from an API or mock data; they only [recognize the interfaces](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/libs/ui/src/domain/usecases/transactionList.ts#L161-L162). Additionally, this layer is agnostic to the frontend framework, ensuring that no framework-specific code (e.g., React) is present.
3. `Repository Interface`, containing [interface](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/libs/ui/src/domain/repositories/transaction.ts) that define the data source that used in the use case, for example fetch, create, update, and delete data.

#### B. Data Layer

The Data Layer [implements the interfaces](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/libs/ui/src/data/openApi/transaction.ts) used in the use case layer, allowing it to determine the data source, whether from an API or mock data. This design enables easy testing of the use cases using mock data without altering the underlying logic. Additionally, the Data Layer is responsible for transforming the API data structures into the entity data structures utilized in the use cases.

#### C. Presentation Layer

Presentation layer will consumes the logic from usecase layer and output it to UI. It consist of the following components :

1. `Controller`, consumes the finite state machine defined in the use case layer and [integrates it into the framework's state management](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/libs/ui/src/presentation/controllers/controller.ts). For instance, in React, this is achieved using `useReducer` to manage state transitions and useEffect to handle side effects of the finite state machine.
2. `Presenter`, this layer is responsible for [mapping the data structures](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/libs/ui/src/presentation/views/transactions/widgets/TransactionList/TransactionList.presenter.tsx#L24) from the entities to the UI props used in the components, ensuring that the frontend displays the appropriate information in a user-friendly manner.
3. `View`, this layer is responsible for [defining the user interface](https://github.com/gatherloop/gatherloop-pos/blob/3a42e3c6956871b779d1b0b085df746f402d1684/libs/ui/src/presentation/views/transactions/widgets/TransactionList/TransactionList.view.tsx), in React, it will contains JSX of the components
