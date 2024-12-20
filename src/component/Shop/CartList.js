import {
  CommonWrapper,
  CommonContainer,
  ContainerTitleArea,
} from "../styledcomponent/common.tsx";
import * as c from "../styledcomponent/cartlist.tsx";
import {
  ItemStorageLabelP,
  ItemStorageType,
} from "../styledcomponent/wishItem.tsx";
import { StyledButton } from "../styledcomponent/button.tsx";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PreviousOrderItemsModal from "./PreviousOrderItemModal.js";
import { useAtomValue,useAtom,useSetAtom } from "jotai/react";
import { tokenAtom, memberAtom,cartCountAtom } from "../../atoms";
import { axiosInToken,url } from "../../config.js";
import axios from 'axios';

function CartList() {
  const navigate = useNavigate();
  const [token,setToken] = useAtom(tokenAtom);
  const store = useAtomValue(memberAtom);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [tempQuantity, setTempQuantity] = useState({}); 
  const [prevOrderDateList,setPrevOrderDateList] =useState([]);
  
  useEffect(() => {
    if (token && store?.storeCode) {
    getCartList();
    getPrevOrderDateList(); //modal에 날짜 전달해서 바로 조회 되도록
    }
  }, [token, store.storeCode]);

  const getCartList = () => {
    axiosInToken(token)
      .get(`cartList?storeCode=${store.storeCode}`)
      .then((res) => {
        if(res.headers.authorization!=null) {
          setToken(res.headers.authorization)
      }
        console.log(res.data);
        setCartItems(res.data);
        setTempQuantity(res.data.item.cartItemCount); // 재 조회 시 임시 수량도 저장
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const getPrevOrderDateList=() =>{
    axiosInToken(token)
    .get(`selectPreviouOrderDate?storeCode=${store.storeCode}`)
    .then((res) => {
      if(res.headers.authorization!=null) {
        setToken(res.headers.authorization)
    }
      setPrevOrderDateList(res.data.orderDates);
    })
    .catch((err) => {
      console.log(err);
    });
  }

  // 이전 상품 추가 버튼 클릭 핸들러 추가
const handlePreviousOrderClick = () => {
  if (!prevOrderDateList || prevOrderDateList.length === 0) {
    alert('이전 주문 상품이 없습니다.');
    return;
  }
  setIsModalOpen(true);
};


  //삭제
  const setCartCount = useSetAtom(cartCountAtom);
  const handleDelete = (cartNum) => {
    const formData = new FormData();
    formData.append("storeCode", store.storeCode);
    formData.append("cartNum", cartNum); 
    axiosInToken(token).post('deleteCartItem', formData)
      .then(res => { //true false반환
       
        if(res.headers.authorization!=null) {
          setToken(res.headers.authorization)
      }
        if (res.data === true) {
          alert('장바구니에서 삭제됐습니다.');
          getCartList();
            // cartCount를 업데이트
            axiosInToken(token).get(`${url}/cartAllCount?storeCode=${store.storeCode}`)
            .then(response => {
              
              if(response.headers.authorization!=null) {
                setToken(res.headers.authorization)
            }
              setCartCount(response.data);   //jotai 값 세팅
            });   

        }
      })
      .catch(err => {
        console.log(err);
      })
  };

  // 임시 수량 변경 
  const handleTempQuantityChange = (cartNum, value) => {
    const newCount = parseInt(value);
    if (newCount >= 1 && newCount <= 999) {
      setTempQuantity(prev => ({
        ...prev,[cartNum]: newCount
      }));
    }
  };
  
  //수량 변경 확정
  const handleQuantityChange = (cartNum) => {
    const formData = new FormData();
    const newCount = tempQuantity[cartNum];  //cartNum key로 value가져오기 
    formData.append("cartNum",cartNum);
    formData.append("count",newCount);
    axiosInToken(token).post('updateCartItemQuantity', formData)
    .then(res=>{
      
      if(res.headers.authorization!=null) {
        setToken(res.headers.authorization)
    }
        alert("수량 변경 됐습니다.");
        getCartList(); // 다시 재 조회 
    }).catch(err=>{
      console.log(err);
    })
  };

 // 총 합계 
const calculateTotal = () => {
  let totalPrice = 0; //변수 재 할당을 위해서 반드시 let으로 선언해야 에러 안남 
  for (let i = 0; i < cartItems.length; i++) {
    totalPrice += cartItems[i].item.itemPrice * cartItems[i].cartItemCount;
  }
  return totalPrice;
};

// 카테고리 
const formatCategory = (item) => {
  let categoryFormat = item.itemMajorCategoryName + '/';  
  categoryFormat += item.itemMiddleCategoryName + '/';    
  
  // 소분류가 없는경우엔 "-"
  if (item.itemSubCategoryName) {
    categoryFormat += item.itemSubCategoryName;
  } else {
    categoryFormat += '-';
  }
  return categoryFormat;
};

//주문하기 -장바구니 전체 주문 
const handleOrder = () => {
  const cartNums = cartItems.map(item => item.cartNum);
  if(cartNums.length===0){
    alert('주문 상품이 존재하지 않습니다.');
    return;
  }
  navigate('/order', { state: { cartNums } }); //주문처리는 url에 남지 않도록 state에 담음.
 };

  return (
    <CommonWrapper>
      <CommonContainer>
        <ContainerTitleArea>
          <h2>장바구니</h2>
        </ContainerTitleArea>
        <c.AddPreviousOrderItem>
          <StyledButton
            size="sm"
            theme="brown"
            $hasicon
            onClick={handlePreviousOrderClick}
          >
            <PlusIcon />
            이전 상품 추가
          </StyledButton>
        </c.AddPreviousOrderItem>

        {/* 모달 추가- 필요한 데이터 전달*/}
        <PreviousOrderItemsModal
          open={isModalOpen}
          handleClose={() => setIsModalOpen(false)}
          storeCode={store.storeCode}
          prevOrderDateList={prevOrderDateList}
          onSuccess={() => { // 모달에서 장바구니에 추가하는 작업이 있을 경우 실행 
            getCartList();  // 장바구니 다시 로드
            setIsModalOpen(false);  // 모달 닫기
          }}
        />

        <c.CartWrap>
          <c.CartHeader>
            <div>이미지</div>
            <div>상품정보</div>
            <div>수량</div>
            <div>상품금액</div>
            <div>카테고리</div>
            <div>배송구분</div>
            <div>보관</div>
            <div>삭제</div>
          </c.CartHeader>

          {cartItems.map((item) => (
            <c.CartItem key={item.cartNum}>
              <div>
                <c.ProductImage
                  src={`${url}/image/${item.item.itemFileName}`}
                  alt={item.item.itemName}
                />
              </div>
              <c.ProductInfo>
                <c.ProductName>{item.item.itemName}</c.ProductName>
                {item.item.itemStorage && (
                  <ItemStorageLabelP>
                    <ItemStorageType $storageway={item.item.itemStorage}>
                      {item.item.itemStorage}
                    </ItemStorageType>
                  </ItemStorageLabelP>
                )}
              </c.ProductInfo>
              <c.QuantityControl>
                <c.QuantityInput
                  type="number"
                  min="1"
                  max="999"
                  value={tempQuantity[item.cartNum]||item.cartItemCount}
                  onChange={(e) =>
                    handleTempQuantityChange(item.cartNum,parseInt(e.target.value))
                  }
                />
                <StyledButton size="sm" theme="white" onClick={() => handleQuantityChange(item.cartNum)}>
                  변경
                </StyledButton>
              </c.QuantityControl>
              <div>{item.item.itemPrice?.toLocaleString()}원</div>
              <c.CategoryInfo>{formatCategory(item.item)}</c.CategoryInfo>
              <div>{item.item.itemStorage==="냉동"?"업체":"일반"}</div>
              <div>{item.item.itemStorage}</div>
              <div>
                <StyledButton size="sm" theme="white" onClick={()=>handleDelete(item.cartNum)}>
                  삭제
                </StyledButton>
              </div>
            </c.CartItem>
          ))}
          <c.SummarySection>
            합계 : <strong>{calculateTotal().toLocaleString()}원</strong>
          </c.SummarySection>
          <c.ButtonSection>
            <StyledButton
              size="md"
              theme="brown"
              onClick={() =>handleOrder()}
            >
              주문하기
            </StyledButton>
          </c.ButtonSection>
        </c.CartWrap>
      </CommonContainer>
    </CommonWrapper>
  );
}
export default CartList;
