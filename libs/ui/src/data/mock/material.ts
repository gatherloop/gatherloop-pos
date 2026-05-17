import { Material, MaterialForm } from '../../domain/entities/Material';
import { MaterialRepository } from '../../domain/repositories/material';

export class MockMaterialRepository implements MaterialRepository {
  public shouldFail: boolean;
  public materials: Material[];

  constructor() {
    this.shouldFail = false;
    this.materials = [
      {
        id: 1,
        name: 'Material 1',
        price: 100,
        unit: 'gram',
        createdAt: '2024-03-20T00:00:00.000Z',
        weeklyUsage: 0,
        purchaseUnit: 'Kg',
        purchaseUnitSize: 1000,
        minimumStock: 2,
        normalStock: 5,
      },
      {
        id: 2,
        name: 'Material 2',
        price: 200,
        unit: 'ml',
        createdAt: '2024-03-21T00:00:00.000Z',
        weeklyUsage: 0,
        purchaseUnit: 'Liter',
        purchaseUnitSize: 1000,
        minimumStock: 3,
        normalStock: 10,
      },
      {
        id: 3,
        name: 'Material 3',
        price: 300,
        unit: 'pcs',
        createdAt: '2024-03-22T00:00:00.000Z',
        weeklyUsage: 0,
        purchaseUnit: 'Pack',
        purchaseUnitSize: 50,
        minimumStock: 1,
        normalStock: 4,
      },
      {
        id: 4,
        name: 'Material 4',
        price: 400,
        unit: 'gram',
        createdAt: '2024-03-23T00:00:00.000Z',
        weeklyUsage: 0,
        purchaseUnit: 'Kg',
        purchaseUnitSize: 1000,
        minimumStock: 0,
        normalStock: 0,
      },
    ];
  }

  fetchMaterialList(params: {
    page: number;
    itemPerPage: number;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
  }) {
    if (this.shouldFail) {
      return Promise.reject(new Error('Failed to fetch materials'));
    }
    const { page, itemPerPage, orderBy } = params;
    // Sort by createdAt
    const sortedMaterials = [...this.materials].sort((a, b) => {
      if (orderBy === 'asc') {
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      } else {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    });
    const start = (page - 1) * itemPerPage;
    const end = start + itemPerPage;
    const paginatedMaterials = sortedMaterials.slice(start, end);
    return Promise.resolve({
      materials: paginatedMaterials,
      totalItem: this.materials.length,
    });
  }

  getMaterialList(params: {
    page: number;
    itemPerPage: number;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
  }) {
    const { page, itemPerPage, orderBy } = params;
    // Sort by createdAt
    const sortedMaterials = [...this.materials].sort((a, b) => {
      if (orderBy === 'asc') {
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      } else {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    });
    const start = (page - 1) * itemPerPage;
    const end = start + itemPerPage;
    const paginatedMaterials = sortedMaterials.slice(start, end);
    return {
      materials: paginatedMaterials,
      totalItem: this.materials.length,
    };
  }

  fetchMaterialById(materialId: number) {
    return Promise.resolve({
      id: materialId,
      name: 'Material 1',
      price: 100,
      unit: 'gram',
      createdAt: '2024-03-20T00:00:00.000Z',
      weeklyUsage: 0,
      purchaseUnit: 'Kg',
      purchaseUnitSize: 1000,
      minimumStock: 2,
      normalStock: 5,
    });
  }

  deleteMaterialById(materialId: number) {
    if (this.shouldFail) {
      return Promise.reject(new Error('Failed to delete material'));
    }
    this.materials = this.materials.filter(
      (material) => material.id !== materialId
    );
    return Promise.resolve();
  }

  createMaterial(formValues: MaterialForm) {
    if (this.shouldFail) {
      return Promise.reject(new Error('Failed to create material'));
    }
    const newId =
      this.materials.length > 0
        ? Math.max(...this.materials.map((m) => m.id)) + 1
        : 1;
    const newMaterial: Material = {
      id: newId,
      name: formValues.name,
      price: formValues.price,
      unit: formValues.unit,
      createdAt: new Date().toISOString(),
      weeklyUsage: 0,
      purchaseUnit: formValues.purchaseUnit,
      purchaseUnitSize: formValues.purchaseUnitSize,
      minimumStock: formValues.minimumStock,
      normalStock: formValues.normalStock,
    };
    this.materials.push(newMaterial);
    return Promise.resolve();
  }

  updateMaterial(formValues: MaterialForm, materialId: number) {
    if (this.shouldFail) {
      return Promise.reject(new Error('Failed to update material'));
    }
    const index = this.materials.findIndex(
      (material) => material.id === materialId
    );
    if (index !== -1) {
      this.materials[index] = {
        ...this.materials[index],
        ...formValues,
      };
    }
    return Promise.resolve();
  }
}
