package restapi

import (
	"apps/api/domain"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetTableId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["tableId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetTableCode(r *http.Request) string {
	vars := mux.Vars(r)
	return vars["code"]
}

func GetTableRequest(r *http.Request) (apiContract.TableRequest, error) {
	var tableRequest apiContract.TableRequest
	err := json.NewDecoder(r.Body).Decode(&tableRequest)
	return tableRequest, err
}

func ToApiTable(table domain.Table) apiContract.Table {
	return apiContract.Table{
		Id:        table.Id,
		Code:      table.Code,
		Label:     table.Label,
		CreatedAt: table.CreatedAt,
		DeletedAt: table.DeletedAt,
	}
}

func ToTable(tableRequest apiContract.TableRequest) domain.Table {
	return domain.Table{
		Label: tableRequest.Label,
	}
}

// ToApiPublicTable strips everything but id and label — the only fields a
// resolved QR code may hand back to a customer (FR-1).
func ToApiPublicTable(table domain.Table) apiContract.PublicTable {
	return apiContract.PublicTable{
		Id:    table.Id,
		Label: table.Label,
	}
}
