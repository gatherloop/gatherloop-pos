package materials

import (
	apiContract "libs/api-contract"
)

type Usecase struct {
	repository Repository
}

func NewUsecase(repository Repository) Usecase {
	return Usecase{repository: repository}
}

func (usecase Usecase) GetMaterialList() ([]apiContract.Material, error) {
	return usecase.repository.GetMaterialList()
}

func (usecase Usecase) GetMaterialById(id int64) (apiContract.Material, error) {
	return usecase.repository.GetMaterialById(id)
}

func (usecase Usecase) CreateMaterial(materialRequest apiContract.MaterialRequest) error {
	return usecase.repository.CreateMaterial(materialRequest)
}

func (usecase Usecase) UpdateMaterialById(materialRequest apiContract.MaterialRequest, id int64) error {
	return usecase.repository.UpdateMaterialById(materialRequest, id)
}

func (usecase Usecase) DeleteMaterialById(id int64) error {
	return usecase.repository.DeleteMaterialById(id)
}
