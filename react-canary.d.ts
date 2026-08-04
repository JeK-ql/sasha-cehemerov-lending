/* App Router виконує код на вендореному React canary, де <ViewTransition>
   уже є, але @types/react ховає його типи за окремим entry — цей reference
   їх вмикає. Видалити, коли ViewTransition стане стабільним у @types/react. */
/// <reference types="react/canary" />
