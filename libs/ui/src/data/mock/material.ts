import { MaterialForm } from '../../domain/entities/Material';
import { MaterialRepository } from '../../domain/repositories/material';

export class MockMaterialRepository implements MaterialRepository {
  public shouldFail = false;
  public materials = [
    {
      id: 1,
      name: 'Material 1',
      price: 100,
      unit: 'kg',
      createdAt: '2024-03-20T00:00:00.000Z',
    },
    {
      id: 2,
      name: 'Material 2',
      price: 200,
      unit: 'kg',
      createdAt: '2024-03-21T00:00:00.000Z',
    },
  ];

  fetchMaterialList(params: any) {
    if (this.shouldFail) {
      return Promise.reject(new Error('Failed to fetch materials'));
    }
    return Promise.resolve({
      materials: this.materials,
      totalItem: this.materials.length,
    });
  }

  getMaterialList(params: any) {
    return {
      materials: this.materials,
      totalItem: this.materials.length,
    };
  }

  fetchMaterialById(materialId: number) {
    return Promise.resolve({
      id: materialId,
      name: 'Material 1',
      price: 100,
      unit: 'kg',
      createdAt: '2024-03-20T00:00:00.000Z',
    });
  }

  deleteMaterialById(materialId: number) {
    return Promise.resolve();
  }

  createMaterial(formValues: MaterialForm) {
    return Promise.resolve();
  }

  updateMaterial(formValues: MaterialForm, materialId: number) {
    return Promise.resolve();
  }
}
