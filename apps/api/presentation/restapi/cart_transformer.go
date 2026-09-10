package restapi

import (
	"apps/api/domain"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetSessionId(r *http.Request) string {
	return r.Header.Get("X-Session-Id")
}

func GetCartItemId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["cartItemId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetCartUpdateTableRequest(r *http.Request) (apiContract.CartUpdateTableRequest, error) {
	var request apiContract.CartUpdateTableRequest
	err := json.NewDecoder(r.Body).Decode(&request)
	return request, err
}

func GetCartItemCreateRequest(r *http.Request) (apiContract.CartItemCreateRequest, error) {
	var request apiContract.CartItemCreateRequest
	err := json.NewDecoder(r.Body).Decode(&request)
	return request, err
}

func GetCartItemUpdateRequest(r *http.Request) (apiContract.CartItemUpdateRequest, error) {
	var request apiContract.CartItemUpdateRequest
	err := json.NewDecoder(r.Body).Decode(&request)
	return request, err
}

func ToApiCartItem(item domain.CartItem) apiContract.CartItem {
	price := item.Variant.Price
	amount := int32(item.Amount)

	return apiContract.CartItem{
		Id:        item.Id,
		CartId:    item.CartId,
		VariantId: item.VariantId,
		Variant:   ToPublicApiVariant(item.Variant),
		Amount:    amount,
		Note:      item.Note,
		Price:     price,
		Subtotal:  price * item.Amount,
		CreatedAt: item.CreatedAt,
	}
}

func ToApiCart(cart domain.Cart) apiContract.Cart {
	apiItems := []apiContract.CartItem{}
	var total float32
	var itemCount int32
	for _, item := range cart.Items {
		apiItem := ToApiCartItem(item)
		apiItems = append(apiItems, apiItem)
		total += apiItem.Subtotal
		itemCount += apiItem.Amount
	}

	var table *apiContract.PublicTable
	if cart.Table != nil {
		apiTable := ToApiPublicTable(*cart.Table)
		table = &apiTable
	}

	return apiContract.Cart{
		Id:        cart.Id,
		SessionId: cart.SessionId,
		TableId:   cart.TableId,
		Table:     table,
		Status:    string(cart.Status),
		Items:     apiItems,
		ItemCount: itemCount,
		Total:     total,
		CreatedAt: cart.CreatedAt,
	}
}
