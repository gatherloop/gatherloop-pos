package restapi_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"apps/api/presentation/restapi"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

// TestExpenseRoute_StatisticsNotSwallowedByExpenseId guards against the
// routing risk called out by the expense statistics PRD: /expenses/statistics
// must be registered (and therefore matched) before /expenses/{expenseId},
// otherwise mux would capture "statistics" as an expenseId path variable.
func TestExpenseRoute_StatisticsNotSwallowedByExpenseId(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	expRepo := mock.NewMockExpenseRepository(ctrl)
	budgetRepo := mock.NewMockBudgetRepository(ctrl)
	walletRepo := mock.NewMockWalletRepository(ctrl)
	usecase := domain.NewExpenseUsecase(expRepo, budgetRepo, walletRepo)
	handler := restapi.NewExpenseHandler(usecase)
	expenseRouter := restapi.NewExpenseRouter(handler)

	router := mux.NewRouter()
	expenseRouter.AddRouter(router)

	req := httptest.NewRequest(http.MethodGet, "/expenses/statistics", nil)

	var match mux.RouteMatch
	matched := router.Match(req, &match)
	require.True(t, matched, "expected /expenses/statistics to match a route")

	_, hasExpenseId := match.Vars["expenseId"]
	assert.False(t, hasExpenseId, "/expenses/statistics must not be captured by /expenses/{expenseId}")
}
