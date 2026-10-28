# Components

`components/` chứa UI dùng chung, không sở hữu nghiệp vụ của một feature.

- `ui/`: primitives như Button, Input, Dialog, Table và Badge. Chúng nhận props và render UI, không gọi API hoặc import feature.
- `layout/`: bố cục và UI dùng chung giữa nhiều route.

Nếu UI chỉ phục vụ một nghiệp vụ, giữ nó trong feature tương ứng. Nếu UI ghép nhiều feature, đặt nó ở `widgets/`.
